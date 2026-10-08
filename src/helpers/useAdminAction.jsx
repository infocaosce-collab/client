import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { postAdminAction } from "../endpoints/admin/action_POST.schema";
/** Runs a control-room action, confirms it, and refreshes every admin view. */
export function useAdminAction(token) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input) => postAdminAction(token, input),
        onSuccess: (res) => {
            toast.success(res.message);
            qc.invalidateQueries({ queryKey: ["adminData"] });
            qc.invalidateQueries({ queryKey: ["adminResults"] });
            qc.invalidateQueries({ queryKey: ["publicSettings"] });
        },
        onError: (err) => toast.error(err.message),
    });
}
