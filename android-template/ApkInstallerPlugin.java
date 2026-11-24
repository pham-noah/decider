package __PACKAGE__;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * The half of an update a web app cannot do: put the APK on disk and hand it to the system installer.
 *
 * <p>Copied into android/ by scripts/patch-android.mjs, because android/ is generated: `cap add android` throws
 * away everything under it, so the plugin lives here and is re-installed on every build.
 *
 * <p>Nothing is decided here. The web side asked GitHub for the newest release, refused it if it is not newer and
 * picked the APK; this only moves the bytes and opens the install sheet. The file lands in the app's own files dir
 * (no storage permission), the URI is minted by the app's existing FileProvider, and the length is checked against
 * what GitHub said before anything is handed over — a truncated download fails here instead of becoming a corrupt
 * installer prompt.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    private static final int CHUNK = 64 * 1024;

    private File updatesDir() {
        File dir = new File(getContext().getFilesDir(), "updates");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        return dir;
    }

    /** Only letters, digits, dots and dashes: the name comes from a release asset and must stay a file name. */
    private static String safeName(String raw) {
        String base = raw == null ? "" : raw.replaceAll("[^A-Za-z0-9._-]", "");
        if (base.isEmpty() || base.startsWith(".")) base = "update.apk";
        if (!base.toLowerCase().endsWith(".apk")) base = base + ".apk";
        return base;
    }

    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("No download URL");
            return;
        }
        final String name = safeName(call.getString("name", "update.apk"));
        final Long size = call.getLong("size", -1L);
        final File target = new File(updatesDir(), name);

        if (size != null && size > 0 && target.isFile() && target.length() == size) {
            JSObject done = new JSObject();
            done.put("path", target.getAbsolutePath());
            done.put("bytes", target.length());
            call.resolve(done);
            return;
        }

        new Thread(() -> {
            HttpURLConnection conn = null;
            File part = new File(target.getAbsolutePath() + ".part");
            try {
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setRequestProperty("Accept", "application/octet-stream");
                conn.setInstanceFollowRedirects(true);
                conn.connect();
                int code = conn.getResponseCode();
                if (code != HttpURLConnection.HTTP_OK) {
                    call.reject("Download failed: HTTP " + code);
                    return;
                }
                long total = size != null && size > 0 ? size : conn.getContentLength();
                long received = 0;
                long lastSent = 0;
                byte[] buf = new byte[CHUNK];
                try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(part)) {
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        received += n;
                        long now = System.currentTimeMillis();
                        if (now - lastSent >= 200) {
                            lastSent = now;
                            JSObject p = new JSObject();
                            p.put("received", received);
                            p.put("total", total);
                            notifyListeners("progress", p);
                        }
                    }
                    out.flush();
                }
                if (total > 0 && received != total) {
                    //noinspection ResultOfMethodCallIgnored
                    part.delete();
                    call.reject("Download was cut short: " + received + " of " + total + " bytes");
                    return;
                }
                if (!part.renameTo(target)) {
                    //noinspection ResultOfMethodCallIgnored
                    part.delete();
                    call.reject("Could not finish writing the update");
                    return;
                }
                JSObject p = new JSObject();
                p.put("received", received);
                p.put("total", received);
                notifyListeners("progress", p);

                JSObject done = new JSObject();
                done.put("path", target.getAbsolutePath());
                done.put("bytes", received);
                call.resolve(done);
            } catch (Exception e) {
                //noinspection ResultOfMethodCallIgnored
                part.delete();
                call.reject("Download failed: " + e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        }, "apk-download").start();
    }

    /** Can this app open the install sheet at all, or does the user have to allow it in Settings first? */
    @PluginMethod
    public void status(PluginCall call) {
        JSObject o = new JSObject();
        o.put("allowed", getContext().getPackageManager().canRequestPackageInstalls());
        call.resolve(o);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
        i.setData(Uri.parse("package:" + getContext().getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("No file to install");
            return;
        }
        File apk = new File(path);
        if (!apk.isFile()) {
            call.reject("The update file is gone; download it again");
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open the installer: " + e.getMessage());
        }
    }
}
